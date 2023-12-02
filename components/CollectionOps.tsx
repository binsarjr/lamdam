"use client";
import CollectionSelector from "@/components/CollectionSelector";
import { post } from "@/lib/FetchWrapper";
import {
  CollectionContext,
  GlobalContext,
  NeedUpdateContext,
} from "@/lib/context";
import { __debug, __error } from "@/lib/logger";
import { AddCollectionSchema } from "@/lib/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@nextui-org/button";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  useDisclosure,
} from "@nextui-org/modal";
import {
  Avatar,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@nextui-org/react";
import { signOut, useSession } from "next-auth/react";
import { Confirm } from "notiflix/build/notiflix-confirm-aio";
import { Loading } from "notiflix/build/notiflix-loading-aio";
import { Report } from "notiflix/build/notiflix-report-aio";
import { FC, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import CInput from "./CInput";
import CSelect from "./CSelect";
import CTextarea from "./CTextarea";
import CompileAllModal from "./CompileAllModal";
import { ErrorLabel } from "./ErrorLabel";
import { useModal } from "./hooks/useModal";
import { GearIcon } from "./icon/GearIcon";
import LogoutIcon from "./icon/LogoutIcon";
import ExportModal from "./modals/ExportModal";
import ImportModal from "./modals/ImportModal";
import { ThemeSwitch } from "./theme-switch";

const CollectionOps: FC = () => {
  return (
    <div className="border grid grid-cols-2 gap-3 p-5">
      <div>
        <CollectionSelector />
        <RecordsStats />
      </div>

      <CollectionOpsButtons />
    </div>
  );
};

export default CollectionOps;

const CollectionOpsButtons = () => {
  const {
    isOpen: isAddCollectionModalOpen,
    onOpen: onAddCollectionModalOpen,
    onOpenChange: onAddCollectionModalOpenChange,
  } = useDisclosure();
  const {
    isOpen: isCompileAllModalOpen,
    onOpen: onCompileAllModalOpen,
    onOpenChange: onCompileAllModalOpenChange,
  } = useDisclosure();

  const { currentCollection, setCurrentCollection } =
    useContext(CollectionContext);
  const { setNeedUpdate } = useContext(NeedUpdateContext);
  const { globalState, setGlobalState } = useContext(GlobalContext);

  const { data: session } = useSession();
  const user = useMemo(() => session?.user, [session]);

  const { showModal } = useModal();

  const doDump = () => {
    if (!currentCollection) {
      return;
    }

    Loading.hourglass(`Compiling collection ${currentCollection.name}...`);
    post(`/api/dumpCollection`, {
      id: currentCollection.id,
    })
      .then((resp: any) => {
        __debug("resp:", resp);
        if (resp.result) {
          Report.success(
            "Compile Success",
            `Total ${resp.result.total} records compiled from collection ${currentCollection.name}`,
            "Okay"
          );
        }
      })
      .catch((err: any) => {
        Report.failure(
          "Failed!",
          `Cannot compile collection: <br/><br/>${err}`,
          "Okay"
        );
      })
      .finally(() => {
        Loading.remove();
      });
  };

  const onDumpClick = () => {
    if (!currentCollection) {
      return;
    }
    if (currentCollection.count > 10000) {
      Confirm.show(
        "Confirmation",
        `Are you sure to compile the collection ${currentCollection.name}? This may take a while for a large collection.`,
        "Yes",
        "No",
        () => {
          doDump();
        }
      );
    } else {
      doDump();
    }
  };

  const showCompileAllModal = () => {
    onCompileAllModalOpen();
  };

  return (
    <>
      <div className="flex items-end justify-end gap-3">
        <Button size="sm" onClick={onDumpClick}>
          Compile
        </Button>
        <Button size="sm" onClick={showCompileAllModal}>
          Compile All
        </Button>
        <div className="border-l-1 h-full bg-slate-300"></div>
        <Button
          size="sm"
          className="hidden md:block"
          onClick={onAddCollectionModalOpen}
        >
          Add
        </Button>
        <Button size="sm" className="hidden md:block">
          Edit
        </Button>
        <Button
          size="sm"
          className="hidden md:block"
          onPress={() => {
            showModal("Export", ExportModal, {
              currentCollection: currentCollection ?? undefined,
            });
          }}
        >
          Export
        </Button>
        <Button
          size="sm"
          className="hidden md:block"
          onPress={() => {
            showModal("Import", ImportModal, {
              currentCollection: currentCollection ?? undefined,
              onImportSuccess: (importedCount) => {
                const currentCollectionTmp = {
                  id: currentCollection!.id,
                  count: currentCollection!.count + importedCount,
                  meta: currentCollection!.meta,
                  name: currentCollection!.name,
                };
                setCurrentCollection?.(currentCollectionTmp);
                setNeedUpdate(true);
              },
            });
          }}
        >
          Import
        </Button>
        <Button
          size="sm"
          isIconOnly
          className="hidden md:inline-flex text-center justify-center items-center"
        >
          <GearIcon width="24px" />
        </Button>
        <Button size="sm" isIconOnly>
          <ThemeSwitch />
        </Button>
        {user && (
          <Dropdown placement="bottom-end" radius="sm">
            <DropdownTrigger>
              <Avatar
                isBordered
                as="button"
                className="transition-transform"
                src={`${user.image}`}
              />
            </DropdownTrigger>
            <DropdownMenu aria-label="Profile Actions" variant="flat">
              <DropdownItem key="profile" className="h-14 gap-2">
                <p className="font-semibold">{user.name}</p>
                <p className="font-normal">{user.email}</p>
              </DropdownItem>
              <DropdownItem
                key="logout"
                color="danger"
                onClick={() => signOut()}
                startContent={<LogoutIcon width="1.4em" height="1.4em" />}
              >
                Log Out
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        )}
      </div>
      <AddCollectionModal
        isAddCollectionModalOpen={isAddCollectionModalOpen}
        onAddCollectionModal={onAddCollectionModalOpen}
        onAddCollectionModalOpenChange={onAddCollectionModalOpenChange}
      />
      <CompileAllModal
        isCompileAllModalOpen={isCompileAllModalOpen}
        onCompileAllModal={onCompileAllModalOpen}
        onCompileAllModalOpenChange={onCompileAllModalOpenChange}
      />
    </>
  );
};

const RecordsStats = () => {
  const { currentCollection } = useContext(CollectionContext);

  let { globalState, setGlobalState } = useContext(GlobalContext);

  const [recordsCount, setRecordsCount] = useState<number>(0);

  useEffect(() => {
    if (!currentCollection) {
      return;
    }
    setRecordsCount(currentCollection.count);
  }, [currentCollection]);

  useEffect(() => {
    if (!currentCollection) {
      return;
    }
    // setRecordsCount(currentCollection.count);
    if (globalState.newRecord) {
      setRecordsCount(recordsCount + 1);
      setGlobalState({ ...globalState, newRecord: null });
    }
    if (globalState.deleteRecord) {
      setRecordsCount(recordsCount - 1);
    }
  }, [globalState]);

  return currentCollection ? (
    <div className="text-sm">{recordsCount} total</div>
  ) : (
    <div></div>
  );
};

const AddCollectionModal: FC<any> = ({
  isAddCollectionModalOpen,
  onAddCollectionModal,
  onAddCollectionModalOpenChange,
}) => {
  const { currentCollection, setCurrentCollection } =
    useContext(CollectionContext);
  const { needUpdate, setNeedUpdate } = useContext(NeedUpdateContext);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(AddCollectionSchema),
  });
  const theForm = useRef(null);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();

  const onSubmit = (onClose: any) => {
    setError("");
    return (data: any) => {
      post("/api/addCollection", data)
        .then((data) => {
          // if (data.result && data.result.length > 0){
          setNeedUpdate(true);
          onClose();
          // }
        })
        .catch((err) => {
          if (err) {
            __error(err);
            setError("Cannot add collection :(");
          }
        });
    };
  };

  return (
    <Modal
      isOpen={isAddCollectionModalOpen}
      onOpenChange={onAddCollectionModalOpenChange}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              Create new collection
            </ModalHeader>
            <ModalBody>
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="flex flex-col gap-3"
                ref={theForm}
              >
                <CInput control={control} name="name" errors={errors} />
                <CInput
                  control={control}
                  name="creator"
                  defaultValue={session?.user?.name}
                  errors={errors}
                  readOnly={session?.user?.name !== undefined}
                />
                <CTextarea
                  control={control}
                  name="description"
                  errors={errors}
                />

                <CSelect
                  control={control}
                  name="dataType"
                  errors={errors}
                  items={[
                    {
                      key: "sft",
                      value: "sft",
                      name: "SFT",
                    },
                    {
                      key: "rm",
                      value: "rm",
                      name: "Reward Modeling",
                    },
                  ]}
                />

                {error && <ErrorLabel message={error} />}
                {/* <code>
                  <pre>{JSON.stringify(errors, null, 2)}</pre>
                </code> */}
              </form>
            </ModalBody>
            <ModalFooter>
              <Button color="danger" variant="light" onClick={onClose}>
                Close
              </Button>
              <Button
                color="primary"
                onPress={(e) => {
                  handleSubmit(onSubmit(onClose))(theForm as any);
                }}
              >
                Action
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};
