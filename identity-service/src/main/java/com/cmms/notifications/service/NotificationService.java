package com.cmms.notifications.service;

import com.cmms.identity.entity.User;
import com.cmms.identity.repository.UserRepository;
import com.cmms.notifications.entity.Notification;
import com.cmms.notifications.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    @Transactional
    public void sendDirect(Integer userId, String type, String message, Integer referenceId) {
        Notification notification = Notification.builder()
                .userId(userId)
                .type(type)
                .message(message)
                .referenceId(referenceId)
                .build();
        notificationRepository.save(notification);
        log.info("Sent notification to user {}: {}", userId, message);
    }

    @Transactional
    public void notifyRoles(List<String> roles, String type, String message, Integer referenceId) {
        List<User> users = userRepository.findAll().stream()
                .filter(u -> u.hasRole(roles.toArray(new String[0])))
                .toList();

        for (User user : users) {
            sendDirect(user.getUserId(), type, message, referenceId);
        }
    }
    
    @Transactional
    public void notifyAdminAndManagers(String type, String message, Integer referenceId) {
        notifyRoles(List.of("ADMIN", "MAINTENANCE_MANAGER"), type, message, referenceId);
    }

    @Transactional
    public void notifyFinance(String type, String message, Integer referenceId) {
        notifyRoles(List.of("FINANCE_MANAGER", "ADMIN"), type, message, referenceId);
    }
}
