package com.cmms.maintenance.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "task_photos")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskPhoto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "photo_id")
    private Integer photoId;

    @Column(name = "task_id", nullable = false)
    private Integer taskId;

    @Column(name = "photo_url", nullable = false)
    private String photoUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "photo_type", nullable = false, length = 20)
    private PhotoType type;

    @Column(name = "captured_at", nullable = false)
    private LocalDateTime capturedAt;

    public enum PhotoType {
        BEFORE,
        AFTER
    }
}
