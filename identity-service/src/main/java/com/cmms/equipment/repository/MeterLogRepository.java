package com.cmms.equipment.repository;

import com.cmms.equipment.entity.MeterLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MeterLogRepository extends JpaRepository<MeterLog, Integer> {
    List<MeterLog> findByMeterIdOrderByRecordedAtDesc(Integer meterId);
}
