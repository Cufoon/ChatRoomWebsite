import React, { useEffect, useRef, useState } from 'react';
import cx from 'classnames';

import { RoomMessage } from '../../../../service/message.ts';
import TitleLine from '../title';
import PictureUploader from '../picture-uploader';
import styles from './index.module.scss';
import { Image } from '@arco-design/web-react';
import { generateColorFromString } from '../../../../utils/util.ts';

interface Props {
  userId: string;
  userNum: number;
  roomMessages: RoomMessage[];
  message: string;
  onMessageInput: (v: string) => void;
  onSendMessage: () => unknown;
  onSendMessageImage: (files: string[]) => unknown;
}

const Communication: React.FC<Props> = ({
  userId,
  userNum,
  roomMessages,
  message,
  onMessageInput,
  onSendMessage,
  onSendMessageImage
}) => {
  const [firstScrolled, setFirstScrolled] = useState(false);
  const [inited, setInited] = useState(false);
  const [shouldOneStep, setShouldOneStep] = useState(true);
  const msgWindowBottomRef = useRef<HTMLDivElement>(null);

  const lastShiftKey = useRef<boolean>(false);
  const lastShiftKeyTimerId = useRef<number>();
  const lastEnterKey = useRef<boolean>(false);
  const lastEnterKeyTimerId = useRef<number>();
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (inited && roomMessages.length > 0) {
      msgWindowBottomRef.current?.scrollIntoView({
        behavior: (shouldOneStep && 'instant') || 'smooth'
      });
    }
  }, [inited, roomMessages, shouldOneStep]);

  useEffect(() => {
    setInited(true);
  }, []);

  useEffect(() => {
    if (inited && !firstScrolled) {
      if (roomMessages.length > 0) {
        setFirstScrolled(true);
        setShouldOneStep(false);
      }
    }
  }, [inited, firstScrolled, roomMessages]);

  const insertNewLine = () => {
    onMessageInput(`${message}\n`);
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    const eKey = e.key.toLowerCase();
    if (eKey === 'shift' || eKey === 'control') {
      lastShiftKeyTimerId.current && clearTimeout(lastShiftKeyTimerId.current);
      lastShiftKeyTimerId.current = undefined;
      lastShiftKey.current = true;
      if (lastEnterKey.current) {
        lastEnterKeyTimerId.current
        && clearTimeout(lastEnterKeyTimerId.current);
        lastEnterKeyTimerId.current = undefined;
        lastEnterKey.current = false;
        insertNewLine();
        setTimeout(() => {
          inputRef.current?.scroll({
            top: inputRef.current?.scrollHeight,
            behavior: 'smooth'
          });
        }, 50);
      }
      return;
    }
    if (eKey === 'enter') {
      e.preventDefault();
      if (lastShiftKey.current) {
        insertNewLine();
        setTimeout(() => {
          inputRef.current?.scroll({
            top: inputRef.current?.scrollHeight,
            behavior: 'smooth'
          });
        }, 50);
      } else {
        lastEnterKey.current = true;
        lastEnterKeyTimerId.current = setTimeout(() => {
          lastEnterKey.current = false;
          lastEnterKeyTimerId.current = undefined;
          onSendMessage();
        }, 200);
      }
    }
  };

  const onKeyUp: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    const eKey = e.key.toLowerCase();
    if (eKey === 'shift' || eKey === 'control') {
      lastShiftKeyTimerId.current = setTimeout(() => {
        lastShiftKey.current = false;
        lastShiftKeyTimerId.current = undefined;
      }, 50);
      return;
    }
    if (eKey === 'enter') {
      e.preventDefault();
    }
  };

  const [visible, setVisible] = useState(false);
  const onShowPictureSender = () => {
    setVisible(true);
  };
  const onHidePictureSender = () => {
    setVisible(false);
  };

  const renderContent = (text: string, type?: string) => {
    if (type === undefined) {
      return (
        <div>
          {text.split('\n').map((item, idx) => {
            console.log(item);
            return <p key={idx}>{item}</p>;
          })}
        </div>
      );
    }
    if (type === 'image') {
      // console.log(text);
      const images = JSON.parse(text) as string[];
      return (
        <>
          {images.map((item, idx) => {
            return (
              <Image
                key={idx}
                src={item}
                alt='image'
                width={200}
                height={200}
                style={{
                  width: '204px',
                  height: '204px',
                  border: '2px solid white',
                  borderRadius: '20px',
                  boxShadow: '0 0 20px 1px rgba(0, 0, 0, 0.05)',
                  margin: '10px'
                }}
              />
            );
          })}
        </>
      );
    }
  };

  return (
    <div className={styles.cardWrapper}>
      <TitleLine title={`在线人数${userNum}`} />
      <div className={styles.contentOuter}>
        <div className={styles.contentScrollable}>
          <div className={styles.content}>
            {roomMessages.map((item) => {
              return (
                <div
                  className={styles.chatCard}
                  key={`${item.uid} ${item.time} ${item.mid}`}
                >
                  <div className={styles.time}>{item.time}</div>
                  <div className={styles.chatCardLine}>
                    <div className={styles.user} style={{ background: generateColorFromString(item.name) }}></div>
                    <div className={styles.messageWrapper}>
                      <div
                        className={cx(styles.message, {
                          [styles.messageMine]: item.uid === userId
                        })}
                      >
                        {renderContent(item.content, item.contentType)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div
              className={styles.bottomIndicator}
              ref={msgWindowBottomRef}
            >
            </div>
          </div>
        </div>
      </div>
      <div className={styles.inputArea}>
        <textarea
          ref={inputRef}
          placeholder='输入内容'
          id='message'
          name='message'
          value={message}
          onChange={(ce) => onMessageInput(ce.target.value)}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          className={styles.message}
        />
        <div className={styles.sendMessage} onClick={onSendMessage}>
          发送
        </div>
        <div className={styles.sendMessage} onClick={onShowPictureSender}>
          发图片
        </div>
      </div>
      <PictureUploader
        visible={visible}
        closer={onHidePictureSender}
        onSendMessageImage={onSendMessageImage}
      />
    </div>
  );
};

export default Communication;
