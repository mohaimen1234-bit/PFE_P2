package com.cmms.equipment.repository;

import com.cmms.equipment.entity.EquipmentDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface EquipmentDocumentRepository extends JpaRepository<EquipmentDocument, Integer> {
    List<EquipmentDocument> findByEquipmentId(Integer equipmentId);
}
