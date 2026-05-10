package com.cmms.maintenance.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "wo_checklists")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class WoChecklist {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "checklist_id")
    private Integer checklistId;

    @Column(name = "wo_id", nullable = false, unique = true)
    private Integer woId;

    @Column(name = "items_json", nullable = false, columnDefinition = "TEXT")
    private String itemsJson; // JSON string of the checklist state

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
