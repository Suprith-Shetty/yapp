package in.yapp.Service;

import in.yapp.DTO.*;
import in.yapp.Entity.*;
import in.yapp.Repository.ConversationMemberRepository;
import in.yapp.Repository.ConversationRepository;
import in.yapp.Repository.MessageRespository;
import in.yapp.Repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.security.Principal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChatService
{
    private final UserRepository userRepository;
    private final MessageRespository messageRespository;
    private final ConversationRepository conversationRepository;
    private final ConversationMemberRepository conversationMemberRepository;


    @Transactional
    public ChatMessageResult saveMessage(ChatMessageDTO messageDTO, Principal principal)
    {
        UUID userId = UUID.fromString(principal.getName());

        User user = userRepository.findById(userId)
                .orElseThrow();

        UUID conversationId = messageDTO.getConversationId();

        Conversation conversation = conversationRepository
                .findById(conversationId)
                .orElseThrow();

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

        List<ConversationMember> members =
                conversationMemberRepository
                        .findByConversationId(conversationId);

        User recipient = members.stream()
                .map(ConversationMember::getUser)
                .filter(member -> !member.getId().equals(userId))
                .findFirst()
                .orElseThrow();



        Message message = new Message();

        message.setSender(user);
        message.setConversation(conversation);
        message.setContent(messageDTO.getContent());
        message.setMessageType(
                MessageType.valueOf(messageDTO.getMessageType())
        );
        message.setFileName(messageDTO.getFileName());
        message.setFileUrl(messageDTO.getFileUrl());
        message.setFileType(messageDTO.getFileType());
        message.setFileSize(messageDTO.getFileSize());
        message.setCreatedAt(Instant.now());
        message.setStatus(MessageStatus.SENT);


        if (messageDTO.getReplyToMessageId() != null) {

            Message originalMessage = messageRespository
                    .findById(messageDTO.getReplyToMessageId())
                    .orElseThrow(() ->
                            new IllegalArgumentException(
                                    "Message being replied to does not exist"
                            )
                    );

            if (!originalMessage.getConversation()
                    .getId()
                    .equals(conversationId)) {

                throw new IllegalArgumentException(
                        "Cannot reply to a message from another conversation"
                );
            }

            message.setReplyTo(originalMessage);

            messageDTO.setReplyToMessageId(
                    originalMessage.getId()
            );

            messageDTO.setReplyToContent(
                    originalMessage.getContent()
            );

            messageDTO.setReplyToSenderUserName(
                    originalMessage.getSender().getUserName()
            );

            messageDTO.setReplyToMessageType(
                    originalMessage.getMessageType().name()
            );

            messageDTO.setReplyToFileName(
                    originalMessage.getFileName()
            );
        }


        messageRespository.save(message);

        messageDTO.setMessageId(message.getId());
        messageDTO.setSenderUserName(user.getUserName());
        messageDTO.setSenderUserId(user.getId());

        return new ChatMessageResult(
                message.getId(),
                messageDTO,
                recipient.getId(),
                message.getStatus(),
                message.getCreatedAt()
        );
    }

    public List<ChatMessageHistoryDTO> getConversationMessages(
            UUID conversationId,
            Principal principal) {

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

        return messageRespository
                .findByConversationIdOrderByCreatedAtAsc(
                        conversationId
                )
                .stream()
                .map(message -> new ChatMessageHistoryDTO(
                        message.getConversation().getId(),
                        message.getId(),
                        message.getSender().getUserName(),
                        message.getContent(),
                        message.getCreatedAt(),
                        message.getStatus(),
                        message.getMessageType().name(),
                        message.getFileName(),
                        message.getFileUrl(),
                        message.getFileType(),
                        message.getFileSize(),

                        // Reply information
                        message.getReplyTo() != null
                                ? message.getReplyTo().getId()
                                : null,

                        message.getReplyTo() != null
                                ? message.getReplyTo().getContent()
                                : null,

                        message.getReplyTo() != null
                                ? message.getReplyTo().getSender().getUserName()
                                : null,

                        message.getReplyTo() != null
                                ? message.getReplyTo().getMessageType().name()
                                : null,

                        message.getReplyTo() != null
                                ? message.getReplyTo().getFileName()
                                : null
                ))
                .toList();
    }

    public TypingMessageResult typing(
            TypingMessageDTO typingMessageDTO,
            Principal principal) {

        UUID userId = UUID.fromString(principal.getName());

        boolean isMember =
                conversationMemberRepository
                        .existsByConversationIdAndUserId(
                                typingMessageDTO.getConversationId(),
                                userId
                        );

        if (!isMember) {
            throw new AccessDeniedException(
                    "You are not a member of this conversation"
            );
        }

        User user = userRepository.findById(userId)
                .orElseThrow();

        return new TypingMessageResult(
                typingMessageDTO.getConversationId(),
                user.getUserName(),
                typingMessageDTO.isTyping()
        );
    }


    @Transactional
    public List<Message> markMessagesAsRead(
            UUID conversationId,
            Principal principal) {

        UUID userId = UUID.fromString(principal.getName());

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

        List<Message> unreadMessages =
                messageRespository
                        .findByConversationIdOrderByCreatedAtAsc(
                                conversationId
                        )
                        .stream()
                        .filter(message ->
                                !message.getSender()
                                        .getId()
                                        .equals(userId)
                        )
                        .filter(message ->
                                message.getStatus() != MessageStatus.READ
                        )
                        .toList();

        unreadMessages.forEach(message ->
                message.setStatus(MessageStatus.READ)
        );

        messageRespository.saveAll(unreadMessages);

        return unreadMessages;
    }



    @Transactional
    public Message markMessageAsRead(
            UUID conversationId,
            UUID messageId,
            Principal principal) {

        UUID userId = UUID.fromString(principal.getName());

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

        Message message =
                messageRespository
                        .findById(messageId)
                        .orElseThrow();

        if (!message.getConversation().getId().equals(conversationId)) {
            throw new AccessDeniedException(
                    "Message does not belong to this conversation"
            );
        }

        if (message.getSender().getId().equals(userId)) {
            throw new AccessDeniedException(
                    "You cannot mark your own message as read"
            );
        }

        message.setStatus(MessageStatus.READ);

        return messageRespository.save(message);
    }


    public ChatMessageResult saveFileMessage(
            UUID conversationId,
            String fileName,
            String fileUrl,
            String fileType,
            Long fileSize,
            String caption,
            Principal principal) {

        UUID userId = UUID.fromString(principal.getName());

        User user = userRepository.findById(userId)
                .orElseThrow();

        Conversation conversation =
                conversationRepository.findById(conversationId)
                        .orElseThrow();

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

        List<ConversationMember> members =
                conversationMemberRepository
                        .findByConversationId(conversationId);

        User recipient = members.stream()
                .map(ConversationMember::getUser)
                .filter(member ->
                        !member.getId().equals(userId)
                )
                .findFirst()
                .orElseThrow();

        Message message = new Message();

        message.setSender(user);
        message.setConversation(conversation);
        message.setContent(caption);
        message.setMessageType(MessageType.FILE);
        message.setFileName(fileName);
        message.setFileUrl(fileUrl);
        message.setFileType(fileType);
        message.setFileSize(fileSize);
        message.setCreatedAt(Instant.now());
        message.setStatus(MessageStatus.SENT);

        messageRespository.save(message);

        ChatMessageDTO dto = new ChatMessageDTO();

        dto.setMessageId(message.getId());
        dto.setConversationId(conversationId);
        dto.setSenderUserName(user.getUserName());
        dto.setContent(caption);
        dto.setMessageType(MessageType.FILE.name());
        dto.setFileName(fileName);
        dto.setFileUrl(fileUrl);
        dto.setFileType(fileType);
        dto.setFileSize(fileSize);
        dto.setCreatedAt(message.getCreatedAt());

        return new ChatMessageResult(
                message.getId(),
                dto,
                recipient.getId(),
                message.getStatus(),
                message.getCreatedAt()
        );
    }


    public boolean isConversationMember(
            UUID conversationId,
            Principal principal) {

        UUID userId =
                UUID.fromString(principal.getName());

        return conversationMemberRepository
                .existsByConversationIdAndUserId(
                        conversationId,
                        userId
                );
    }


}