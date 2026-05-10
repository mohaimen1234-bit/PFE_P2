package com.cmms.maintenance.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskResponse {
    private Integer       taskId;
    private Integer       woId;
    private Integer       templateId;
    private String        title;
    private String        description;
    private String        notes;
    private String        status;
    private Integer       assignedToUserId;
    private String        assignedToName;
    private Integer       parentTaskId;
    private BigDecimal    estimatedDuration;
    private BigDecimal    actualDuration;
    private LocalDateTime dueDate;
    private String        priority;
    private Integer       departmentId;
    private Integer       orderIndex;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private String        completedBy;
    private LocalDateTime skippedAt;
    private String        skippedBy;
    private String        blockedReason;
    private String        failureReason;
    private List<SubTaskResponse> subTasks;
    private Boolean       isAdHoc;
    private Integer       createdByUserId;
    private String        approvalStatus;
    private Integer       approvedByUserId;
    private LocalDateTime approvedAt;
    private Integer       followOnTaskId;
    private List<TaskAuditLogResponse> auditLogs;
    private List<TaskResponse> childTasks;
    private Double progress;
    private Long totalTimerDuration;
    private LocalDateTime currentTimerStartedAt;
    private List<TaskPhotoResponse> photos;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TaskPhotoResponse {
        private Integer photoId;
        private String photoUrl;
        private String type;
        private LocalDateTime capturedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TaskAuditLogResponse {
        private Long id;
        private String oldStatus;
        private String newStatus;
        private String changedBy;
        private String note;
        private LocalDateTime changedAt;
    }
}
