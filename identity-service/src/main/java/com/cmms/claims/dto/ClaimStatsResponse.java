package com.cmms.claims.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ClaimStatsResponse {
    private long total;
    private long pending;
    private long inProgress;
    private long closed;
}
