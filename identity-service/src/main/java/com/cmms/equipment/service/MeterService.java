package com.cmms.equipment.service;

import com.cmms.equipment.entity.Meter;
import com.cmms.equipment.entity.MeterLog;
import com.cmms.equipment.entity.MeterThreshold;
import com.cmms.equipment.exception.ResourceNotFoundException;
import com.cmms.equipment.repository.MeterLogRepository;
import com.cmms.equipment.repository.MeterRepository;
import com.cmms.equipment.repository.MeterThresholdRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.Authentication;
import com.cmms.identity.security.UserPrincipal;
import com.cmms.identity.entity.User;

@Service
@RequiredArgsConstructor
public class MeterService {

    private final MeterRepository meterRepository;
    private final MeterLogRepository logRepository;
    private final MeterThresholdRepository thresholdRepository;
    private final com.cmms.maintenance.service.MeterTriggerService meterTriggerService;
    private final com.cmms.identity.service.AuditLogService auditLogService;

    private static final String ENTITY_NAME = "Meter";

    @Transactional(readOnly = true)
    public List<Meter> getAllMeters() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof UserPrincipal up) {
            User u = up.getUser();
            if (u != null && u.hasRole("TECHNICIAN") && u.getDepartment() != null) {
                return meterRepository.findAllByDepartmentId(u.getDepartment().getDepartmentId());
            }
        }
        return meterRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Meter getMeterById(Integer id) {
        return meterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Meter not found with ID: " + id));
    }

    @Transactional
    public Meter createMeter(Meter meter) {
        return meterRepository.save(meter);
    }

    @Transactional
    public MeterLog recordLog(Integer meterId, String operation, BigDecimal amount) {
        Meter meter = getMeterById(meterId);
        if (amount == null || amount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Amount must be non-negative");
        }
        String op = operation != null ? operation.trim().toUpperCase() : "";
        if (!op.equals("ADD") && !op.equals("SUBTRACT")) {
            throw new IllegalArgumentException("Operation must be ADD or SUBTRACT");
        }

        BigDecimal current = meter.getValue() != null ? meter.getValue() : BigDecimal.ZERO;
        BigDecimal resulting = op.equals("ADD") ? current.add(amount) : current.subtract(amount);
        if (resulting.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Resulting meter value cannot be negative");
        }

        MeterLog log = MeterLog.builder()
                .meterId(meterId)
                .value(amount)
                .operation(op)
                .resultingValue(resulting)
                .build();

        meter.setValue(resulting);
        meter.setLastReadingAt(java.time.LocalDateTime.now());
        meterRepository.save(meter);

        logRepository.save(log);

        // Update threshold currentValues on ADD
        if (op.equals("ADD")) {
            List<MeterThreshold> thresholds = thresholdRepository.findByMeterId(meterId);
            for (MeterThreshold threshold : thresholds) {
                BigDecimal tCurrent = threshold.getCurrentValue() != null ? threshold.getCurrentValue() : BigDecimal.ZERO;
                threshold.setCurrentValue(tCurrent.add(amount));
                thresholdRepository.save(threshold);
            }
        } else if (op.equals("SUBTRACT")) {
             List<MeterThreshold> thresholds = thresholdRepository.findByMeterId(meterId);
             for (MeterThreshold threshold : thresholds) {
                 BigDecimal tCurrent = threshold.getCurrentValue() != null ? threshold.getCurrentValue() : BigDecimal.ZERO;
                 BigDecimal newCurrent = tCurrent.subtract(amount);
                 if (newCurrent.compareTo(BigDecimal.ZERO) < 0) newCurrent = BigDecimal.ZERO;
                 threshold.setCurrentValue(newCurrent);
                 thresholdRepository.save(threshold);
             }
        }

        // Trigger automated maintenance checks
        meterTriggerService.evaluateMeterReadings(meter);

        Actor actor = getCurrentActor();
        auditLogService.log(
                actor.userId(),
                actor.displayName(),
                "RECORD_METER_LOG",
                ENTITY_NAME,
                meterId,
                "Recorded meter log for " + meter.getName() + ": " + op + " " + amount + " " + meter.getUnit() + " (New value: " + resulting + ")"
        );

        return log;
    }

    @Transactional(readOnly = true)
    public List<MeterLog> getLogs(Integer meterId) {
        return logRepository.findByMeterIdOrderByRecordedAtDesc(meterId);
    }

    @Transactional
    public MeterThreshold createThreshold(Integer meterId, BigDecimal thresholdValue, String label) {
        MeterThreshold threshold = MeterThreshold.builder()
                .meterId(meterId)
                .thresholdValue(thresholdValue)
                .label(label)
                .currentValue(BigDecimal.ZERO)
                .build();
        return thresholdRepository.save(threshold);
    }

    @Transactional(readOnly = true)
    public List<MeterThreshold> getThresholds(Integer meterId) {
        return thresholdRepository.findByMeterId(meterId);
    }

    @Transactional(readOnly = true)
    public Optional<String> checkThreshold(Integer meterId, BigDecimal ignoredValue) {
        List<MeterThreshold> thresholds = thresholdRepository.findByMeterId(meterId);
        for (MeterThreshold threshold : thresholds) {
            BigDecimal currentVal = threshold.getCurrentValue() != null ? threshold.getCurrentValue() : BigDecimal.ZERO;
            if (threshold.getThresholdValue() != null && currentVal.compareTo(threshold.getThresholdValue()) >= 0) {
                return Optional
                        .of("Threshold Exceeded: Current " + currentVal + " >= Threshold " + threshold.getThresholdValue());
            }
        }
        return Optional.empty();
    }

    @Transactional
    public Meter resetMeter(Integer meterId) {
        Meter meter = getMeterById(meterId);
        
        List<MeterThreshold> thresholds = thresholdRepository.findByMeterId(meterId);
        for (MeterThreshold threshold : thresholds) {
            threshold.setCurrentValue(BigDecimal.ZERO);
            threshold.setLastResetAt(java.time.LocalDateTime.now());
            thresholdRepository.save(threshold);
        }
        
        Actor actor = getCurrentActor();
        auditLogService.log(
                actor.userId(),
                actor.displayName(),
                "RESET_METER_THRESHOLDS",
                ENTITY_NAME,
                meterId,
                "Reset threshold trackers for meter " + meter.getName() + " to 0"
        );
        
        return meter;
    }
    
    @Transactional
    public void resetThresholdsForEquipment(Integer equipmentId) {
        List<Meter> meters = meterRepository.findAllByEquipmentId(equipmentId);
        for (Meter meter : meters) {
            resetMeter(meter.getMeterId());
        }
    }

    @Transactional
    public Meter updateMeter(Integer id, Meter meterDetails) {
        Meter meter = getMeterById(id);
        if (meterDetails.getName() != null)
            meter.setName(meterDetails.getName());
        if (meterDetails.getUnit() != null)
            meter.setUnit(meterDetails.getUnit());
        if (meterDetails.getMeterType() != null)
            meter.setMeterType(meterDetails.getMeterType());
        if (meterDetails.getEquipmentId() != null)
            meter.setEquipmentId(meterDetails.getEquipmentId());
        return meterRepository.save(meter);
    }

    private Actor getCurrentActor() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return new Actor(null, "System");
        }
        Object principal = auth.getPrincipal();
        if (principal instanceof UserPrincipal up) {
            User u = up.getUser();
            return new Actor(u != null ? u.getUserId() : null, u != null ? u.getFullName() : up.getUsername());
        }
        return new Actor(null, auth.getName());
    }

    private record Actor(Integer userId, String displayName) {}
}
