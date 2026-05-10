package com.cmms.bi.repository;

import com.cmms.bi.entity.InventoryTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface InventoryTransactionRepository extends JpaRepository<InventoryTransaction, Integer> {
    List<InventoryTransaction> findByPartIdOrderByCreatedAtDesc(Integer partId);
}
