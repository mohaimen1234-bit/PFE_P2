package com.cmms.maintenance.repository;

import com.cmms.maintenance.entity.SubTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SubTaskRepository extends JpaRepository<SubTask, Integer> {
    List<SubTask> findByTaskIdOrderByOrderIndexAsc(Integer taskId);
}
