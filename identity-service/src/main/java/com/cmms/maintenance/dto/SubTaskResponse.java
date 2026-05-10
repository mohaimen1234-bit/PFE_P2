package com.cmms.maintenance.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubTaskResponse {
    private Integer id;
    private Integer taskId;
    private String description;
    private Boolean isCompleted;
    private Integer orderIndex;
}
