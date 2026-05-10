package com.cmms.ai.repository;

import com.cmms.ai.entity.AiPrioritySuggestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AiPrioritySuggestionRepository extends JpaRepository<AiPrioritySuggestion, Integer> {
    Optional<AiPrioritySuggestion> findByClaimId(Integer claimId);
}
