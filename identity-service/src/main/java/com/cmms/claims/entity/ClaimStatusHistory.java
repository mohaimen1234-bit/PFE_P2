package com.cmms.claims.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "claim_status_history")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClaimStatusHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer id;

    @Column(name = "claim_id")
    private Integer claimId;

    @Enumerated(EnumType.STRING)
    @Column(name = "old_status", length = 50)
    private ClaimStatus oldStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "new_status", length = 50)
    private ClaimStatus newStatus;

    @Column(name = "changed_at")
    private LocalDateTime changedAt;

    @Column(name = "changed_by", length = 255)
    private String changedBy;

    @Column(name = "note")
    private String note;
}
