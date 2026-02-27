package com.example.api.storyseed;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.example.api.storyseed.dto.StoryCharacterCreateRequest;
import com.example.api.storyseed.dto.StoryCharacterResponse;
import com.example.api.storyseed.dto.StoryCharacterUpdateRequest;
import com.example.api.storyseed.dto.StoryReadmeUpdateRequest;
import com.example.api.storyseed.dto.StoryTermCreateRequest;
import com.example.api.storyseed.dto.StoryTermResponse;
import com.example.api.storyseed.dto.StoryTermUpdateRequest;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/stories/{storyId}")
public class WorldbuildingController {

    private final WorldbuildingService worldbuildingService;

    public WorldbuildingController(WorldbuildingService worldbuildingService) {
        this.worldbuildingService = worldbuildingService;
    }

    @GetMapping("/characters")
    public List<StoryCharacterResponse> listCharacters(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable Long storyId) {
        return worldbuildingService.listCharacters(user.getUsername(), storyId);
    }

    @PostMapping("/characters")
    @ResponseStatus(HttpStatus.CREATED)
    public StoryCharacterResponse createCharacter(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable Long storyId,
            @Valid @RequestBody StoryCharacterCreateRequest request) {
        return worldbuildingService.createCharacter(user.getUsername(), storyId, request);
    }

    @PutMapping("/characters/{characterId}")
    public StoryCharacterResponse updateCharacter(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable Long storyId,
            @PathVariable Long characterId,
            @Valid @RequestBody StoryCharacterUpdateRequest request) {
        return worldbuildingService.updateCharacter(user.getUsername(), storyId, characterId, request);
    }

    @DeleteMapping("/characters/{characterId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCharacter(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable Long storyId,
            @PathVariable Long characterId) {
        worldbuildingService.deleteCharacter(user.getUsername(), storyId, characterId);
    }

    @GetMapping("/terms")
    public List<StoryTermResponse> listTerms(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable Long storyId) {
        return worldbuildingService.listTerms(user.getUsername(), storyId);
    }

    @PostMapping("/terms")
    @ResponseStatus(HttpStatus.CREATED)
    public StoryTermResponse createTerm(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable Long storyId,
            @Valid @RequestBody StoryTermCreateRequest request) {
        return worldbuildingService.createTerm(user.getUsername(), storyId, request);
    }

    @PutMapping("/terms/{termId}")
    public StoryTermResponse updateTerm(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable Long storyId,
            @PathVariable Long termId,
            @Valid @RequestBody StoryTermUpdateRequest request) {
        return worldbuildingService.updateTerm(user.getUsername(), storyId, termId, request);
    }

    @DeleteMapping("/terms/{termId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTerm(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable Long storyId,
            @PathVariable Long termId) {
        worldbuildingService.deleteTerm(user.getUsername(), storyId, termId);
    }

    @GetMapping("/readme")
    public Map<String, String> getReadme(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable Long storyId) {
        String content = worldbuildingService.getReadme(user.getUsername(), storyId);
        return Map.of("contentMarkdown", content != null ? content : "");
    }

    @PutMapping("/readme")
    public Map<String, String> putReadme(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable Long storyId,
            @RequestBody StoryReadmeUpdateRequest request) {
        String content = worldbuildingService.putReadme(user.getUsername(), storyId,
                request != null ? request : new StoryReadmeUpdateRequest(""));
        return Map.of("contentMarkdown", content != null ? content : "");
    }
}
