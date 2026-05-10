package com.cmms.equipment.repository;

import com.cmms.equipment.entity.EquipmentModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EquipmentModelRepository extends JpaRepository<EquipmentModel, Integer> {
    boolean existsByNameIgnoreCase(String name);
}
