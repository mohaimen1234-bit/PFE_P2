package com.cmms.maintenance.repository;

import com.cmms.maintenance.entity.WoChecklist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface WoChecklistRepository extends JpaRepository<WoChecklist, Integer> {
    Optional<WoChecklist> findByWoId(Integer woId);
    void deleteByWoId(Integer woId);
}
