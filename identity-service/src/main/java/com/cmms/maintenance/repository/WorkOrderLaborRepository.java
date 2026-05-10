package com.cmms.maintenance.repository;

import com.cmms.maintenance.entity.WorkOrderLabor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WorkOrderLaborRepository extends JpaRepository<WorkOrderLabor, Integer> {
    List<WorkOrderLabor> findByWoId(Integer woId);
    List<WorkOrderLabor> findByUserId(Integer userId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE WorkOrderLabor l SET l.userId = NULL WHERE l.userId = :userId")
    void nullifyTechnicianReferences(@org.springframework.data.repository.query.Param("userId") Integer userId);
}
