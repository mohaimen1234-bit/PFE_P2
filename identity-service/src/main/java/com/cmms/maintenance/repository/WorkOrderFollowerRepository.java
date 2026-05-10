package com.cmms.maintenance.repository;

import com.cmms.maintenance.entity.WorkOrderFollower;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WorkOrderFollowerRepository extends JpaRepository<WorkOrderFollower, Integer> {
    List<WorkOrderFollower> findByWoId(Integer woId);
    Optional<WorkOrderFollower> findByWoIdAndUserId(Integer woId, Integer userId);
    void deleteByWoIdAndUserId(Integer woId, Integer userId);
    boolean existsByWoIdAndUserId(Integer woId, Integer userId);
    void deleteByUserId(Integer userId);
}
