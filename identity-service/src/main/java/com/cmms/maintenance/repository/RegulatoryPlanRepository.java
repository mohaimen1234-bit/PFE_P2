package com.cmms.maintenance.repository;

import com.cmms.maintenance.entity.RegulatoryPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RegulatoryPlanRepository extends JpaRepository<RegulatoryPlan, Integer>, JpaSpecificationExecutor<RegulatoryPlan> {
    Optional<RegulatoryPlan> findByPlanCode(String planCode);
}
