package com.cmms.maintenance.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CancelWorkOrderRequest {
    private String cancellationNotes;
}
