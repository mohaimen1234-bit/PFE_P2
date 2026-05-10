package com.cmms.claims.repository;

import com.cmms.claims.entity.ClaimStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClaimStatusHistoryRepository extends JpaRepository<ClaimStatusHistory, Integer> {

    List<ClaimStatusHistory> findByClaimIdOrderByChangedAtDesc(Integer claimId);
}
