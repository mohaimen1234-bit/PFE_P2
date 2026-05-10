package com.cmms.claims.repository;

import com.cmms.claims.entity.Claim;
import com.cmms.claims.entity.ClaimStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClaimRepository extends JpaRepository<Claim, Integer>, JpaSpecificationExecutor<Claim> {

    long countByStatus(ClaimStatus status);

    long countByStatusIn(List<ClaimStatus> statuses);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE Claim c SET c.requesterId = NULL WHERE c.requesterId = :userId")
    void nullifyRequesterReferences(@org.springframework.data.repository.query.Param("userId") Integer userId);
}
