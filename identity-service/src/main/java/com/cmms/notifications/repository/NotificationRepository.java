package com.cmms.notifications.repository;

import com.cmms.notifications.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Integer> {
    List<Notification> findByUserIdAndIsReadFalseOrderByCreatedAtDesc(Integer userId);
    Page<Notification> findByUserIdOrderByCreatedAtDesc(Integer userId, Pageable pageable);
    long countByUserIdAndIsReadFalse(Integer userId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE Notification n SET n.isRead = true, n.readAt = CURRENT_TIMESTAMP WHERE n.userId = :userId AND n.isRead = false")
    void markAllAsRead(@org.springframework.data.repository.query.Param("userId") Integer userId);

    void deleteByUserId(Integer userId);
}
