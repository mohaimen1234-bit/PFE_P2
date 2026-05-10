package com.cmms.equipment.repository;

import com.cmms.equipment.entity.EquipmentCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EquipmentCategoryRepository extends JpaRepository<EquipmentCategory, Integer> {
    boolean existsByNameIgnoreCase(String name);
}
