package com.cmms.equipment.repository;

import com.cmms.equipment.entity.EquipmentHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface EquipmentHistoryRepository extends JpaRepository<EquipmentHistory, Integer> {
    List<EquipmentHistory> findByEquipmentIdOrderByCreatedAtDesc(Integer equipmentId);
}
