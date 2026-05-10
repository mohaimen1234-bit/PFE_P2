package com.cmms.maintenance.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskTemplateResponse {
    private Integer id;
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
    private List<TaskTemplateItemDTO> items;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TaskTemplateItemDTO {
        private Integer id;
        private String label;
        private String description;
        private Integer sortOrder;
        private Boolean isRequired;
        private Integer estimatedMinutes;
    }
}
