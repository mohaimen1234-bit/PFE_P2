package com.cmms.maintenance.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "work_order_followers")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkOrderFollower {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "wo_id", nullable = false)
    private Integer woId;

    @Column(name = "user_id", nullable = false)
    private Integer userId;
}
