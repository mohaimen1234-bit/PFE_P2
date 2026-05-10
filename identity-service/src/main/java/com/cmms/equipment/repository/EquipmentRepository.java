package com.cmms.equipment.repository;

import com.cmms.equipment.entity.Equipment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import java.util.List;

@Repository
public interface EquipmentRepository extends JpaRepository<Equipment, Integer>, JpaSpecificationExecutor<Equipment> {
    long countByStatus(com.cmms.equipment.entity.EquipmentStatus status);
    long countByCriticality(com.cmms.equipment.entity.EquipmentCriticality criticality);
    boolean existsByCategoryId(Integer categoryId);
    boolean existsByModelId(Integer modelId);
    List<Equipment> findAllByDepartmentId(Integer departmentId);
}
