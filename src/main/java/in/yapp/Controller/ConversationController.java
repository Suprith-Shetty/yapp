package in.yapp.Controller;


import in.yapp.DTO.ChatMessageHistoryDTO;
import in.yapp.DTO.ConversationListDTO;
import in.yapp.Entity.Conversation;
import in.yapp.Entity.Message;
import in.yapp.Entity.User;
import in.yapp.Repository.UserRepository;
import in.yapp.Service.ChatService;
import in.yapp.Service.ConversationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PostAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/conversations")
@RequiredArgsConstructor
public class ConversationController
{
    private final ConversationService conversationService;
    private final UserRepository userRepository;
    private final ChatService chatService;

    @PostMapping("/direct/{userId}")
    public Conversation createOrGetDirectConversation(
            @PathVariable UUID userId,
            Principal principal) {

        UUID currentUserId =
                UUID.fromString(principal.getName());

        User currentUser =
                userRepository.findById(currentUserId)
                        .orElseThrow();

        User otherUser =
                userRepository.findById(userId)
                        .orElseThrow();

        return conversationService
                .findorCreateDirectConversation(
                        currentUser,
                        otherUser
                );
    }

    @GetMapping
    public List<ConversationListDTO> getConversationList(
            Principal principal) {

        UUID userId = UUID.fromString(principal.getName());

        return conversationService.getConversationList(userId);
    }


    @GetMapping("/{conversationId}/messages")
    public List<ChatMessageHistoryDTO> getMessages(
            @PathVariable UUID conversationId,
            Principal principal) {

        return chatService.getConversationMessages(
                conversationId,
                principal
        );
    }


    @GetMapping("/{conversationId}/unread")
    public Map<String, Object> getUnreadCount(
            @PathVariable UUID conversationId,
            Principal principal) {

        UUID userId = UUID.fromString(principal.getName());

        long unreadCount =
                conversationService.getUnreadCount(
                        conversationId,
                        userId
                );

        return Map.of(
                "conversationId", conversationId,
                "unreadCount", unreadCount
        );
    }

    @PutMapping("/{conversationId}/read")
    public void markAsRead(
            @PathVariable UUID conversationId,
            Principal principal) {

        UUID userId = UUID.fromString(principal.getName());

        conversationService.markAsRead(
                conversationId,
                userId
        );
    }




}
