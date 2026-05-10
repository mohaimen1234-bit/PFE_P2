package com.cmms.equipment.repository;

import com.cmms.equipment.entity.MeterThreshold;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MeterThresholdRepository extends JpaRepository<MeterThreshold, Integer> {
    List<MeterThreshold> findByMeterId(Integer meterId);
    void deleteByMeterId(Integer meterId);
}
