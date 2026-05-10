package com.cmms.equipment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MeterLogResponse {
    private Integer logId;
    private Integer meterId;
    private BigDecimal value;
    private String operation;
    private BigDecimal resultingValue;
    private LocalDateTime recordedAt;
    private String alert;
}
