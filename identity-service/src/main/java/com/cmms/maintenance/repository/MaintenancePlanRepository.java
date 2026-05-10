package com.cmms.maintenance.repository;

import com.cmms.maintenance.entity.MaintenancePlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface MaintenancePlanRepository extends JpaRepository<MaintenancePlan, Integer> {
    List<MaintenancePlan> findByIsActiveTrueAndNextDueDateBefore(LocalDateTime now);
    List<MaintenancePlan> findByEquipmentId(Integer equipmentId);
    List<MaintenancePlan> findByMeterIdAndIsActiveTrue(Integer meterId);
}
