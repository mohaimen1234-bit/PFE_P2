package com.cmms.claims.repository;

import com.cmms.claims.entity.ClaimPhoto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClaimPhotoRepository extends JpaRepository<ClaimPhoto, Integer> {

    List<ClaimPhoto> findByClaimId(Integer claimId);

    long countByClaimId(Integer claimId);
}
