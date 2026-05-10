package com.cmms.inventory.repository;

import com.cmms.inventory.entity.RestockRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface RestockRequestRepository extends JpaRepository<RestockRequest, Integer> {
    List<RestockRequest> findByStatus(RestockRequest.RestockStatus status);
    long countByStatus(RestockRequest.RestockStatus status);
    List<RestockRequest> findByPartId(Integer partId);
}
