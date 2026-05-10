package com.cmms.maintenance.service;

import com.cmms.maintenance.dto.WorkOrderLaborResponse;
import com.cmms.maintenance.entity.WorkOrderLabor;
import com.cmms.maintenance.repository.WorkOrderLaborRepository;
import com.cmms.claims.exception.ResourceNotFoundException;
import com.cmms.identity.entity.User;
import com.cmms.identity.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WorkOrderLaborService {

    private final WorkOrderLaborRepository laborRepository;
    private final UserRepository userRepository;

    @Transactional
    public WorkOrderLaborResponse logLabor(Integer woId, Integer userId, Integer durationMinutes, BigDecimal hourlyRate, String notes) {
        BigDecimal totalCost = hourlyRate.multiply(new BigDecimal(durationMinutes)).divide(new BigDecimal(60), 2, BigDecimal.ROUND_HALF_UP);

        WorkOrderLabor labor = WorkOrderLabor.builder()
                .woId(woId)
                .userId(userId)
                .durationMinutes(durationMinutes)
                .hourlyRate(hourlyRate)
                .totalCost(totalCost)
                .notes(notes)
                .build();

        return toResponse(laborRepository.save(labor));
    }

    public List<WorkOrderLaborResponse> listByWo(Integer woId) {
        return laborRepository.findByWoId(woId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    private WorkOrderLaborResponse toResponse(WorkOrderLabor labor) {
        String userName = userRepository.findById(labor.getUserId())
                .map(User::getFullName)
                .orElse("Unknown User");

        return WorkOrderLaborResponse.builder()
                .laborId(labor.getLaborId())
                .woId(labor.getWoId())
                .userId(labor.getUserId())
                .userName(userName)
                .durationMinutes(labor.getDurationMinutes())
                .hourlyRate(labor.getHourlyRate())
                .totalCost(labor.getTotalCost())
                .notes(labor.getNotes())
                .createdAt(labor.getCreatedAt())
                .build();
    }
}
