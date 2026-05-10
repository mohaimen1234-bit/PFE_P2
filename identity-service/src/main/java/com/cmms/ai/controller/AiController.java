package com.cmms.ai.controller;

import com.cmms.ai.dto.PredictionResponse;
import com.cmms.ai.service.AiService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.List;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@Tag(name = "AI", description = "Predictive maintenance and risk analysis")
@SecurityRequirement(name = "bearerAuth")
public class AiController {

    private final AiService aiService;

    @GetMapping("/predictions")
    @PreAuthorize("hasAnyRole('ADMIN', 'MAINTENANCE_MANAGER', 'FINANCE_MANAGER')")
    @Operation(summary = "Get predictive risk scores for all equipment")
    public List<PredictionResponse> getPredictions() {
        return aiService.getPredictions();
    }
}
