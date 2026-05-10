package com.cmms.notifications.controller;

import com.cmms.notifications.entity.Notification;
import com.cmms.notifications.repository.NotificationRepository;
import com.cmms.notifications.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@Tag(name = "Notifications", description = "System alerts and maintenance recommendations")
@SecurityRequirement(name = "bearerAuth")
@RequiredArgsConstructor
public class NotificationsController {

    private final NotificationRepository notificationRepository;
    private final NotificationService notificationService;

    @GetMapping
    @Operation(summary = "Get unread notifications for current user")
    public List<Notification> getUnread(@RequestParam Integer userId) {
        return notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId);
    }

    @GetMapping("/all")
    @Operation(summary = "Get all notifications for user (paginated)")
    public Page<Notification> getAll(
            @RequestParam Integer userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(page, size));
    }

    @PatchMapping("/{id}/read")
    @Operation(summary = "Mark notification as read")
    public Notification markAsRead(@PathVariable Integer id) {
        Notification note = notificationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        note.setIsRead(true);
        note.setReadAt(LocalDateTime.now());
        return notificationRepository.save(note);
    }

    @GetMapping("/count")
    @Operation(summary = "Count unread notifications")
    public long countUnread(@RequestParam Integer userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    @PostMapping("/mark-all-read")
    @Transactional
    @Operation(summary = "Mark all notifications as read for current user")
    public void markAllRead(@RequestParam Integer userId) {
        notificationRepository.markAllAsRead(userId);
    }
}
