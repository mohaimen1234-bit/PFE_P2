package com.cmms.equipment.controller;

import com.cmms.equipment.dto.MeterLogRequest;
import com.cmms.equipment.dto.MeterLogResponse;
import com.cmms.equipment.dto.MeterResponse;
import com.cmms.equipment.dto.MeterThresholdRequest;
import com.cmms.equipment.entity.Meter;
import com.cmms.equipment.entity.MeterLog;
import com.cmms.equipment.entity.MeterThreshold;
import com.cmms.equipment.repository.EquipmentRepository;
import com.cmms.equipment.service.MeterService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/meters")
@RequiredArgsConstructor
public class MeterController {

    private final MeterService meterService;
    private final EquipmentRepository equipmentRepository;

    @GetMapping
    public List<MeterResponse> getAll() {
        return meterService.getAllMeters().stream()
                .map(this::mapToResponse)
                .toList();
    }

    @GetMapping("/{id}")
    public MeterResponse getById(@PathVariable Integer id) {
        return mapToResponse(meterService.getMeterById(id));
    }

    @PostMapping("/{id}/logs")
    @ResponseStatus(HttpStatus.CREATED)
    public MeterLogResponse recordLog(@PathVariable Integer id, @RequestBody MeterLogRequest request) {
        MeterLog log = meterService.recordLog(id, request.getOperation(), request.getAmount());

        // Threshold Check
        Optional<String> alert = meterService.checkThreshold(id, log.getResultingValue());

        return MeterLogResponse.builder()
                .logId(log.getLogId())
                .meterId(log.getMeterId())
                .value(log.getValue())
                .operation(log.getOperation())
                .resultingValue(log.getResultingValue())
                .recordedAt(log.getRecordedAt())
                .alert(alert.orElse(null))
                .build();
    }

    @GetMapping("/{id}/logs")
    public List<MeterLog> getLogs(@PathVariable Integer id) {
        return meterService.getLogs(id);
    }

    @PostMapping("/{id}/thresholds")
    @ResponseStatus(HttpStatus.CREATED)
    public MeterThreshold createThreshold(@PathVariable Integer id, @RequestBody MeterThresholdRequest request) {
        return meterService.createThreshold(id, request.getThresholdValue(), request.getLabel());
    }

    @GetMapping("/{id}/thresholds")
    public List<MeterThreshold> getThresholds(@PathVariable Integer id) {
        return meterService.getThresholds(id);
    }

    @PostMapping("/{id}/reset")
    public MeterResponse reset(@PathVariable Integer id) {
        return mapToResponse(meterService.resetMeter(id));
    }

    private MeterResponse mapToResponse(Meter meter) {
        String equipmentName = equipmentRepository.findById(meter.getEquipmentId())
                .map(equipment -> equipment.getName())
                .orElse(null);
        List<MeterThreshold> thresholdObjects = meterService.getThresholds(meter.getMeterId());
        List<java.math.BigDecimal> thresholds = thresholdObjects.stream()
                .map(MeterThreshold::getThresholdValue)
                .toList();

        return MeterResponse.builder()
                .meterId(meter.getMeterId())
                .equipmentId(meter.getEquipmentId())
                .equipmentName(equipmentName)
                .name(meter.getName())
                .value(meter.getValue())
                .unit(meter.getUnit())
                .meterType(meter.getMeterType())
                .lastReadingAt(meter.getLastReadingAt())
                .thresholds(thresholds == null ? Collections.emptyList() : thresholds)
                .thresholdDetails(thresholdObjects == null ? Collections.emptyList() : thresholdObjects)
                .build();
    }
}
