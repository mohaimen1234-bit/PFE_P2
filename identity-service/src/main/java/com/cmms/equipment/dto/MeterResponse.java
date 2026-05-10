package com.cmms.equipment.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class MeterResponse {
    private Integer meterId;
    private Integer equipmentId;
    private String equipmentName;
    private String name;
    private BigDecimal value;
    private String unit;
    private String meterType;
    private LocalDateTime lastReadingAt;
    private List<BigDecimal> thresholds;
    private List<com.cmms.equipment.entity.MeterThreshold> thresholdDetails;
}
