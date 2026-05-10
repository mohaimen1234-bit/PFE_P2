package com.cmms.inventory.repository;

import com.cmms.inventory.entity.PartUsage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PartUsageRepository extends JpaRepository<PartUsage, Integer> {
    List<PartUsage> findByWoId(Integer woId);
    List<PartUsage> findByPartId(Integer partId);
    List<PartUsage> findByTaskId(Integer taskId);
}
