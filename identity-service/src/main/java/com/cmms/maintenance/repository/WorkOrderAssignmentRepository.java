package com.cmms.maintenance.repository;

import com.cmms.maintenance.entity.WorkOrderAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WorkOrderAssignmentRepository extends JpaRepository<WorkOrderAssignment, Integer> {
    List<WorkOrderAssignment> findByWoId(Integer woId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    void deleteByWoId(Integer woId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    void deleteByUserId(Integer userId);
}
