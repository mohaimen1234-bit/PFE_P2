package com.cmms.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FailureAnalysisTimelineEventDto {
    private LocalDateTime date;
    private String eventType;
    private String label;
}
