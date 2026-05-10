package com.cmms.claims.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RejectClaimRequest {
    private String rejectionNotes;
}
