package com.cmms.equipment.repository;

import com.cmms.equipment.entity.Meter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface MeterRepository extends JpaRepository<Meter, Integer> {
    Optional<Meter> findByEquipmentId(Integer equipmentId);
    List<Meter> findAllByEquipmentId(Integer equipmentId);

    @Query("SELECT m FROM Meter m JOIN Equipment e ON m.equipmentId = e.equipmentId WHERE e.departmentId = :departmentId")
    List<Meter> findAllByDepartmentId(@Param("departmentId") Integer departmentId);
}
