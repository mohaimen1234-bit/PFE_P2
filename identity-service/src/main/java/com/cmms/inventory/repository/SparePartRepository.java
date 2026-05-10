package com.cmms.inventory.repository;

import com.cmms.inventory.entity.SparePart;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SparePartRepository extends JpaRepository<SparePart, Integer>, JpaSpecificationExecutor<SparePart> {
    List<SparePart> findByQuantityInStockLessThanEqual(Integer minStock);
}
