package com.cmms.maintenance.repository;

import com.cmms.maintenance.entity.TaskPhoto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TaskPhotoRepository extends JpaRepository<TaskPhoto, Integer> {
    List<TaskPhoto> findByTaskId(Integer taskId);
}
