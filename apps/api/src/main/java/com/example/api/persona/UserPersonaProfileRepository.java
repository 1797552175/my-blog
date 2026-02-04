package com.example.api.persona;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface UserPersonaProfileRepository extends JpaRepository<UserPersonaProfile, Long> {

    Optional<UserPersonaProfile> findByUserId(Long userId);
}
