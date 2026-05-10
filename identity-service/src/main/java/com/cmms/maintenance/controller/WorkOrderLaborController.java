package com.cmms.maintenance.controller;

import com.cmms.maintenance.dto.WorkOrderLaborResponse;
import com.cmms.maintenance.service.WorkOrderLaborService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/maintenance/work-orders/{woId}/labor")
@RequiredArgsConstructor
public class WorkOrderLaborController {

    private final WorkOrderLaborService laborService;

    @PostMapping
    public WorkOrderLaborResponse logLabor(
            @PathVariable Integer woId,
            @RequestParam Integer userId,
            @RequestParam Integer durationMinutes,
            @RequestParam BigDecimal hourlyRate,
            @RequestParam(required = false) String notes
    ) {
        return laborService.logLabor(woId, userId, durationMinutes, hourlyRate, notes);
    }

    @GetMapping
    public List<WorkOrderLaborResponse> listByWo(@PathVariable Integer woId) {
        return laborService.listByWo(woId);
    }
}
