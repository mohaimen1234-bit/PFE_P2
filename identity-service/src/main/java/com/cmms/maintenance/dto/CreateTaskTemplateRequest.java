package com.cmms.maintenance.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateTaskTemplateRequest {
    private String code;
    private String name;
    private String description;
    private Integer equipmentCategoryId;
    private Integer departmentId;
    private String defaultPriority;
    private BigDecimal estimatedHours;
    private String defaultAssigneeRole;
    private Boolean requiresValidation;
    private Boolean requiresDocument;
    private Boolean isActive;
    private List<ItemRequest> items;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ItemRequest {
        private String label;
        private String description;
        private Integer sortOrder;
        private Boolean isRequired;
        private Integer estimatedMinutes;
    }
}
