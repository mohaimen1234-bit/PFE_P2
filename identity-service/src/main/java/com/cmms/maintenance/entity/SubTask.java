package com.cmms.maintenance.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "sub_tasks")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "task_id", nullable = false)
    private Integer taskId;

    @Column(nullable = false)
    private String description;

    @Builder.Default
    @Column(name = "is_completed", nullable = false)
    private Boolean isCompleted = false;

    @Column(name = "order_index")
    private Integer orderIndex;
}
