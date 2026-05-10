package com.cmms.maintenance.service;

import com.cmms.identity.entity.User;
import com.cmms.identity.repository.UserRepository;
import com.cmms.maintenance.dto.TechnicianRecommendationDTO;
import com.cmms.maintenance.entity.WorkOrder;
import com.cmms.maintenance.repository.WorkOrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TechnicianAvailabilityService {

    private final UserRepository userRepository;
    private final WorkOrderRepository workOrderRepository;
    private final com.cmms.equipment.repository.EquipmentRepository equipmentRepository;

    private static final List<WorkOrder.WorkOrderStatus> ACTIVE_STATUSES = Arrays.asList(
            WorkOrder.WorkOrderStatus.ASSIGNED,
            WorkOrder.WorkOrderStatus.SCHEDULED,
            WorkOrder.WorkOrderStatus.IN_PROGRESS,
            WorkOrder.WorkOrderStatus.ON_HOLD
    );

    /**
     * Recommends technicians for a specific work order based on their current workload,
     * calculated dynamically from their active tasks.
     *
     * @param targetWorkOrder The new work order we are trying to assign
     * @return List of ranked technician recommendations
     */
    public List<TechnicianRecommendationDTO> getRecommendations(Integer targetWorkOrderId) {
        WorkOrder targetWorkOrder = null;
        com.cmms.equipment.entity.Equipment targetEquipment = null;
        if (targetWorkOrderId != null) {
            targetWorkOrder = workOrderRepository.findById(targetWorkOrderId).orElse(null);
            if (targetWorkOrder != null && targetWorkOrder.getEquipmentId() != null) {
                targetEquipment = equipmentRepository.findById(targetWorkOrder.getEquipmentId()).orElse(null);
            }
        }
        
        List<User> activeUsers = userRepository.findByIsActiveTrue();
        List<TechnicianRecommendationDTO> recommendations = new ArrayList<>();

        for (User user : activeUsers) {
            List<WorkOrder> activeTasks = workOrderRepository.findByAssignedToUserIdAndStatusIn(user.getUserId(), ACTIVE_STATUSES);
            
            double totalWorkload = 0.0;
            boolean hasCriticalActive = false;

            for (WorkOrder task : activeTasks) {
                double typeWeight = getTypeWeight(task.getWoType());
                double durationWeight = getDurationWeight(task.getEstimatedDuration());
                double priorityWeight = getPriorityWeight(task.getPriority());
                double statusWeight = getStatusWeight(task.getStatus());

                double taskLoad = typeWeight * durationWeight * priorityWeight * statusWeight;
                totalWorkload += taskLoad;

                if (task.getPriority() == WorkOrder.WorkOrderPriority.CRITICAL && task.getStatus() == WorkOrder.WorkOrderStatus.IN_PROGRESS) {
                    hasCriticalActive = true;
                }
            }

            String availabilityStatus = determineAvailabilityStatus(totalWorkload, hasCriticalActive);
            List<String> badges = new ArrayList<>();
            double rankScore = 100.0 - (totalWorkload * 5.0);

            // Department Match Constraint
            boolean isDepartmentMismatch = false;
            if (user.getDepartment() != null && targetEquipment != null && targetEquipment.getDepartmentId() != null) {
                if (!java.util.Objects.equals(user.getDepartment().getDepartmentId(), targetEquipment.getDepartmentId())) {
                    isDepartmentMismatch = true;
                }
            }

            if (isDepartmentMismatch) {
                availabilityStatus = "Unavailable";
                badges.add("Department Mismatch");
                rankScore = -100.0;
            } else {
                if (totalWorkload == 0) {
                    badges.add("Available Now");
                }
                if (hasCriticalActive) {
                    badges.add("Critical Task Active");
                }

                // Exclude users with Overloaded status from top recommendations, but still show them
                if (availabilityStatus.equals("Overloaded")) {
                    badges.add("Overloaded");
                }
            }

            String deptName = user.getDepartment() != null ? user.getDepartment().getDepartmentName() : "N/A";

            recommendations.add(TechnicianRecommendationDTO.builder()
                    .userId(user.getUserId())
                    .fullName(user.getFullName())
                    .departmentName(deptName)
                    .availabilityStatus(availabilityStatus)
                    .workloadScore(Math.round(totalWorkload * 10.0) / 10.0)
                    .activeTasksCount(activeTasks.size())
                    .badges(badges)
                    .finalRankScore(rankScore)
                    .build());
        }

        // Sort by finalRankScore descending
        recommendations.sort(Comparator.comparingDouble(TechnicianRecommendationDTO::getFinalRankScore).reversed());

        // Assign "Best Match" to the top candidate if they are not overloaded
        if (!recommendations.isEmpty() && recommendations.get(0).getFinalRankScore() > 0) {
            recommendations.get(0).getBadges().add("Best Match");
        }

        return recommendations;
    }

    private double getTypeWeight(WorkOrder.WorkOrderType type) {
        if (type == null) return 1.0;
        return switch (type) {
            case CORRECTIVE -> 4.0;
            case PREDICTIVE -> 2.0;
            case PREVENTIVE, REGULATORY -> 1.0;
            default -> 1.0;
        };
    }

    private double getDurationWeight(BigDecimal estimatedDuration) {
        if (estimatedDuration == null) return 2.0; // Default if unknown
        double hours = estimatedDuration.doubleValue();
        if (hours < 1.0) return 1.0;
        if (hours <= 4.0) return 3.0;
        return 5.0;
    }

    private double getPriorityWeight(WorkOrder.WorkOrderPriority priority) {
        if (priority == null) return 1.0;
        return switch (priority) {
            case LOW -> 1.0;
            case MEDIUM -> 1.2;
            case HIGH -> 1.5;
            case CRITICAL -> 2.0;
            default -> 1.0;
        };
    }

    private double getStatusWeight(WorkOrder.WorkOrderStatus status) {
        if (status == null) return 0.5;
        return switch (status) {
            case ASSIGNED, SCHEDULED -> 0.5;
            case IN_PROGRESS -> 1.0;
            case ON_HOLD -> 0.3;
            default -> 0.0;
        };
    }

    private String determineAvailabilityStatus(double totalWorkload, boolean hasCriticalActive) {
        if (hasCriticalActive) {
            return "Busy"; // Could also be Unavailable
        }
        if (totalWorkload == 0) {
            return "Available";
        } else if (totalWorkload < 5.0) {
            return "Partially Available";
        } else if (totalWorkload < 15.0) {
            return "Busy";
        } else {
            return "Overloaded";
        }
    }
}
