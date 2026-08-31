package in.yapp.Service;

import in.yapp.DTO.ReactionDTO;
import in.yapp.DTO.ReactionRequestDTO;
import in.yapp.Entity.Message;
import in.yapp.Entity.MessageReaction;
import in.yapp.Entity.User;
import in.yapp.Repository.ConversationMemberRepository;
import in.yapp.Repository.MessageReactionRepository;
import in.yapp.Repository.MessageRespository;
import in.yapp.Repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import in.yapp.DTO.ReactionEventDTO;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.security.Principal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MessageReactionService {

    private static final List<String> ALLOWED_REACTIONS =
            List.of("❤️", "😂", "😮", "😢", "👍", "🙏");

    private final MessageReactionRepository reactionRepository;
    private final MessageRespository messageRespository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final ConversationMemberRepository conversationMemberRepository;

    @Transactional
    public ReactionDTO react(
            UUID messageId,
            ReactionRequestDTO request,
            Principal principal
    ) {

        UUID userId = UUID.fromString(principal.getName());

        String emoji = request.getEmoji();

        if (emoji == null || !ALLOWED_REACTIONS.contains(emoji)) {
            throw new IllegalArgumentException("Invalid reaction");
        }

        Message message = messageRespository
                .findById(messageId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Message does not exist")
                );

        UUID conversationId =
                message.getConversation().getId();

        boolean isMember =
                conversationMemberRepository
                        .existsByConversationIdAndUserId(
                                conversationId,
                                userId
                        );

        if (!isMember) {
            throw new AccessDeniedException(
                    "You are not a member of this conversation"
            );
        }

        User user =
                userRepository.findById(userId)
                        .orElseThrow();

        MessageReaction reaction =
                reactionRepository
                        .findByMessageIdAndUserId(
                                messageId,
                                userId
                        )
                        .orElse(null);

        if (reaction == null) {

            reaction = new MessageReaction();

            reaction.setMessage(message);
            reaction.setUser(user);
            reaction.setEmoji(emoji);
            reaction.setCreatedAt(Instant.now());

        } else {

            reaction.setEmoji(emoji);
        }

        reactionRepository.save(reaction);

        ReactionDTO response = new ReactionDTO(
                reaction.getId(),
                messageId,
                userId,
                user.getUserName(),
                reaction.getEmoji()
        );

        ReactionEventDTO event = new ReactionEventDTO(
                "ADD",
                messageId,
                conversationId,
                reaction.getId(),
                userId,
                user.getUserName(),
                reaction.getEmoji()
        );

        messagingTemplate.convertAndSend(
                "/topic/conversations." + conversationId,
                event
        );

        return response;
    }

    @Transactional
    public void removeReaction(
            UUID messageId,
            String emoji,
            Principal principal
    ) {

        UUID userId =
                UUID.fromString(principal.getName());

        Message message =
                messageRespository.findById(messageId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Message does not exist"
                                )
                        );

        boolean isMember =
                conversationMemberRepository
                        .existsByConversationIdAndUserId(
                                message.getConversation().getId(),
                                userId
                        );

        if (!isMember) {
            throw new AccessDeniedException(
                    "You are not a member of this conversation"
            );
        }

        reactionRepository
                .findByMessageIdAndUserId(
                        messageId,
                        userId
                )
                .ifPresent(reaction -> {

                    if (reaction.getEmoji().equals(emoji)) {

                        UUID conversationId =
                                message.getConversation().getId();

                        ReactionEventDTO event =
                                new ReactionEventDTO(
                                        "REMOVE",
                                        messageId,
                                        conversationId,
                                        reaction.getId(),
                                        userId,
                                        reaction.getUser().getUserName(),
                                        reaction.getEmoji()
                                );

                        reactionRepository.delete(reaction);

                        messagingTemplate.convertAndSend(
                                "/topic/conversations." + conversationId,
                                event
                        );
                    }
                });
    }

    public List<ReactionDTO> getConversationReactions(
            UUID conversationId,
            Principal principal
    ) {

        UUID userId =
                UUID.fromString(principal.getName());

        boolean isMember =
                conversationMemberRepository
                        .existsByConversationIdAndUserId(
                                conversationId,
                                userId
                        );

        if (!isMember) {
            throw new AccessDeniedException(
                    "You are not a member of this conversation"
            );
        }

        return reactionRepository
                .findByMessageConversationId(conversationId)
                .stream()
                .map(reaction ->
                        new ReactionDTO(
                                reaction.getId(),
                                reaction.getMessage().getId(),
                                reaction.getUser().getId(),
                                reaction.getUser().getUserName(),
                                reaction.getEmoji()
                        )
                )
                .toList();
    }
}